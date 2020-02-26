package com.b12powered.area.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ListView
import android.widget.Toast
import androidx.fragment.app.Fragment
import com.b12powered.area.*
import com.b12powered.area.activities.ServiceInformationActivity
import com.b12powered.area.api.ApiClient
import kotlinx.android.synthetic.main.fragment_create_area.*

class AddAreaFragment(private val service: Service, private val area: Area, private val ar: ActionReaction, private val step: AreaCreationStatus) : Fragment() {
    companion object {
        fun newInstance(service: Service, area: Area, ar: ActionReaction, step: AreaCreationStatus): AddAreaFragment {
            return AddAreaFragment(service, area, ar, step)
        }
    }

    private lateinit var listView: ListView

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_add_area, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        listView = view.findViewById(R.id.list)

        val editModelArrayList = initList()
        val adapter = EditTextListAdapter(activity!!, editModelArrayList)
        listView.adapter = adapter

        submit_button.setOnClickListener {
            submit(editModelArrayList)
        }
    }

    private fun initList(): ArrayList<EditModel> {
        val list: ArrayList<EditModel> = ArrayList()

        ar.configSchema.forEach { option ->
            val editModel = EditModel()
            editModel.setEditTextValue(option.name)
            list.add(editModel)
        }
        return list
    }

    private fun submit(editModelArrayList: ArrayList<EditModel>) {
        val options: HashMap<String, Any> = HashMap()

        editModelArrayList.forEach { input ->
            val value = input.getEditTextValue()
            if (value.isEmpty()) {
                Toast.makeText(
                    context,
                    getString(R.string.missing_parameter),
                    Toast.LENGTH_SHORT
                ).show()
                return
            }
            options[ar.configSchema[editModelArrayList.indexOf(input)].name] = input.getEditTextValue()
        }

        when(step) {
            is AreaCreationStatus.ActionSelected -> addAction(options)
            else -> addReaction(options)
        }
    }

    private fun addAction(options: HashMap<String, Any>) {
        ApiClient(activity!!)
            .addAction(area.id, service.name + ".A." + ar.name, options) { success, response ->
                if (success) {
                    (activity as ServiceInformationActivity).nextStep(area, null, AreaCreationStatus.ActionAdded)
                } else {
                    Toast.makeText(
                        context,
                        response,
                        Toast.LENGTH_SHORT
                    ).show()
                }
            }
    }

    private fun addReaction(options: HashMap<String, Any>) {
        ApiClient(activity!!)
            .addReaction(area.id, service.name + ".R." + ar.name, options) { success, response ->
                if (success) {
                    (activity as ServiceInformationActivity).nextStep(area, null, AreaCreationStatus.ReactionAdded)
                } else {
                    Toast.makeText(
                        context,
                        response,
                        Toast.LENGTH_SHORT
                    ).show()
                }
            }
    }
}